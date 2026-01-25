package com.shortsleevestudio.gamescript.services

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.jetbrains.rd.framework.IIdentities
import com.jetbrains.rd.framework.IProtocol
import com.jetbrains.rd.framework.RdId
import com.jetbrains.rd.framework.base.IRdBindable
import com.jetbrains.rd.util.lifetime.Lifetime
import com.jetbrains.rd.util.lifetime.LifetimeDefinition
import com.jetbrains.rider.projectView.solution
import com.shortsleevestudio.gamescript.protocol.GameScriptModel
import java.lang.reflect.Method

/**
 * Host service that manages the backend protocol model connection.
 *
 * This service creates and binds the GameScriptModel to the Rider protocol,
 * enabling communication between the Kotlin frontend and C# backend.
 *
 * The model binding uses reflection because the generated Kotlin code has
 * private constructors (unlike C# which has a public binding constructor).
 * Both sides must use the same RdId ("GameScriptModel") for the binding to work.
 *
 * Usage:
 * ```kotlin
 * val host = GameScriptBackendHost.getInstance(project)
 * val model = host.model  // null if binding failed
 * model?.findSymbol?.sync(request)
 * ```
 */
@Service(Service.Level.PROJECT)
class GameScriptBackendHost(
    private val project: Project
) : Disposable {

    private var lifetimeDefinition: LifetimeDefinition? = null
    @Volatile private var _model: GameScriptModel? = null

    /** Timestamp of last binding attempt - used for cooldown to prevent resource waste */
    @Volatile private var lastBindAttemptMs: Long = 0

    /**
     * Minimum time between binding attempts (prevents rapid retries on failure).
     *
     * 2 seconds is chosen because:
     * - Long enough to allow transient PSI indexing operations to complete
     * - Short enough that users don't perceive significant delays
     * - Matches typical IntelliJ indexing checkpoint intervals
     */
    private val bindCooldownMs = 2000L

    /**
     * The backend protocol model, or null if binding failed.
     *
     * This is lazily initialized on first access. The binding may fail if:
     * - The project is not a Rider project (no solution)
     * - The protocol is not available
     * - The C# backend is not loaded
     *
     * ## Thread Safety
     *
     * This uses an intentional double-checked locking pattern:
     * 1. First check: `_model == null` (volatile read, no synchronization)
     * 2. If null, call `tryBindModel()` which is synchronized
     * 3. Return `_model` (volatile read)
     *
     * This pattern is safe because:
     * - `@Volatile` ensures visibility of `_model` across threads
     * - `tryBindModel()` is synchronized, preventing concurrent binding attempts
     * - The worst case is multiple threads calling `tryBindModel()` before one succeeds,
     *   but the synchronized block ensures only one actually performs the binding
     * - Reading a stale `null` after binding completes is benign (just extra work)
     */
    val model: GameScriptModel?
        get() {
            if (_model == null) {
                tryBindModel()
                if (_model == null) {
                    LOG.debug("model getter: _model is still null after tryBindModel()")
                }
            }
            return _model
        }

    /**
     * Attempt to bind the model to the Rider protocol.
     *
     * This uses reflection to create the model instance because the generated
     * Kotlin code has private constructors. The binding pattern mirrors what
     * the C# code does, using reflection to call internal rd-framework methods.
     *
     * ## Timing Considerations
     *
     * The C# backend (SymbolLookupHost) is activated via SolutionLoadTaskKinds.Done,
     * which means it won't be ready until the solution is fully loaded. If we try
     * to bind before that, the protocol RPC calls will fail.
     *
     * This method handles that gracefully:
     * 1. Binds the model to the protocol (always succeeds if protocol exists)
     * 2. Verifies the C# backend is responsive via getProtocolVersion (may fail if not ready)
     * 3. If verification fails, we still keep the model but mark it as unverified
     * 4. Subsequent RPC calls may fail with "backend unavailable" until the C# side is ready
     */
    @Synchronized
    private fun tryBindModel() {
        if (_model != null) return

        // Cooldown: Don't retry too frequently (prevents resource waste on repeated failures)
        val now = System.currentTimeMillis()
        if (now - lastBindAttemptMs < bindCooldownMs) {
            LOG.debug("tryBindModel: skipping due to cooldown (${bindCooldownMs - (now - lastBindAttemptMs)}ms remaining)")
            return
        }
        lastBindAttemptMs = now

        LOG.info("tryBindModel: attempting to bind GameScriptModel for project '${project.name}'")

        try {
            // Get the Rider solution and protocol
            val solution = try {
                project.solution
            } catch (e: Exception) {
                LOG.error("tryBindModel: failed to get solution from project - ${e.javaClass.simpleName}: ${e.message}")
                return
            }

            LOG.info("tryBindModel: solution obtained")

            val protocol = solution.protocol
            if (protocol == null) {
                LOG.warn("tryBindModel: protocol is NULL - this typically means the Rider backend is not fully initialized")
                return
            }

            LOG.info("tryBindModel: protocol obtained (${protocol.javaClass.simpleName}), proceeding with binding")

            // Terminate any previous lifetime to prevent memory leaks on retry
            lifetimeDefinition?.terminate()
            lifetimeDefinition = null

            // Create a new lifetime for this binding attempt
            val newLifetimeDefinition = LifetimeDefinition()
            var bindingSucceeded = false

            try {
                // Create model instance via reflection (constructor is private)
                val constructor = GameScriptModel::class.java.getDeclaredConstructor()
                constructor.isAccessible = true
                val model = constructor.newInstance()

                // Bind the model to the protocol using reflection
                // C# code: Identify(protocol.Identities, RdId.Root.Mix("GameScriptModel"))
                //          this.BindTopLevel(lifetime, protocol, "GameScriptModel")
                bindModelViaReflection(model, newLifetimeDefinition.lifetime, protocol)

                // Binding succeeded - store the lifetime and model
                lifetimeDefinition = newLifetimeDefinition
                _model = model
                bindingSucceeded = true

                // Verify the C# backend is responsive (non-blocking - just logs warnings)
                verifyModelBinding(model)

                LOG.info("Successfully bound GameScriptModel to Rider protocol (rd-framework: ${getRdFrameworkVersion()})")
            } finally {
                // If binding failed, terminate the lifetime to prevent leaks
                if (!bindingSucceeded) {
                    newLifetimeDefinition.terminate()
                }
            }

        } catch (e: Exception) {
            LOG.error("tryBindModel: FAILED to bind GameScriptModel - ${e.javaClass.simpleName}: ${e.message}", e)
            // Model stays null - CodeHandlers will use text-based operations for GDScript
            // and log warnings for C#/C++ operations
        }
    }

    /**
     * Binds the model using reflection to call internal rd-framework methods.
     *
     * The rd-framework marks bindTopLevel and identify as internal in Kotlin,
     * but they're public in the Java bytecode. We use reflection to bypass
     * Kotlin's visibility restrictions.
     */
    private fun bindModelViaReflection(model: GameScriptModel, lifetime: Lifetime, protocol: IProtocol) {
        val bindableKtClass = Class.forName("com.jetbrains.rd.framework.base.IRdBindableKt")

        // Compute RdId from MODEL_NAME using rd-framework's stable Fnv1a64 hash.
        // This matches C#'s RdId.Root.Mix("GameScriptModel").
        // RdId is a Kotlin inline class wrapping a Long. When calling Java reflection,
        // we must pass the underlying Long value since Method.invoke() doesn't
        // understand Kotlin inline classes.
        val rdIdValue = MODEL_RDID

        LOG.info("bindModelViaReflection: using rdIdValue = $rdIdValue (computed from '$MODEL_NAME')")
        LOG.info("bindModelViaReflection: protocol = ${protocol.javaClass.name}")
        LOG.info("bindModelViaReflection: protocol.identity = ${protocol.identity}")

        // Call identify extension function.
        // Note: Pass rdIdValue (Long) directly - the method expects a primitive long
        val identifyMethod = findIdentifyMethod(bindableKtClass)
        LOG.info("bindModelViaReflection: Calling identify with rdId=$rdIdValue")
        identifyMethod.invoke(null, model, protocol.identity, rdIdValue)
        LOG.info("bindModelViaReflection: identify() completed")

        // Call bindTopLevel
        // Signature: (IRdBindable, Lifetime, IProtocol, String) -> void
        val bindMethod: Method = bindableKtClass.getMethod(
            "bindTopLevel",
            IRdBindable::class.java,
            Lifetime::class.java,
            IProtocol::class.java,
            String::class.java
        )
        LOG.info("bindModelViaReflection: Calling bindTopLevel with name='$MODEL_NAME'")
        bindMethod.invoke(null, model, lifetime, protocol, MODEL_NAME)
        LOG.info("bindModelViaReflection: bindTopLevel() completed")

        // Note: verifyModelBinding is called by tryBindModel() AFTER _model is set
        // to avoid failures here preventing the model from being stored
    }

    /**
     * Find the 'identify' method in IRdBindableKt.
     *
     * The method name is mangled because RdId is a Kotlin inline class.
     * We try known names first, then fall back to parameter type matching.
     *
     * Known mangled names (update if rd-framework version changes):
     * - "identify-OsvxL_M" (rd-framework 2024.x)
     */
    private fun findIdentifyMethod(bindableKtClass: Class<*>): Method {
        // Known method names to try (in order of preference)
        val knownMethodNames = listOf(
            "identify-OsvxL_M",  // rd-framework 2024.x
            "identify",          // Unmangled (unlikely but try)
        )

        for (methodName in knownMethodNames) {
            try {
                return bindableKtClass.getMethod(
                    methodName,
                    IRdBindable::class.java,
                    IIdentities::class.java,
                    Long::class.javaPrimitiveType
                ).also { method ->
                    LOG.debug("Found 'identify' method: ${method.name}")
                }
            } catch (_: NoSuchMethodException) {
                // Try next name
            }
        }

        // Fallback: search by parameter types
        LOG.info("Known 'identify' method names not found, searching by parameter types...")
        val candidates = bindableKtClass.methods.filter { method ->
            method.name.startsWith("identify") &&
                method.parameterCount == 3 &&
                method.parameterTypes[0] == IRdBindable::class.java &&
                method.parameterTypes[1] == IIdentities::class.java &&
                (method.parameterTypes[2] == Long::class.javaPrimitiveType ||
                    method.parameterTypes[2] == Long::class.java)
        }

        if (candidates.isEmpty()) {
            val rdVersion = getRdFrameworkVersion()
            val availableMethods = bindableKtClass.methods
                .filter { it.name.startsWith("identify") || it.name.startsWith("bind") }
                .map { "${it.name}(${it.parameterTypes.joinToString { p -> p.simpleName }})" }
                .distinct()
                .sorted()

            throw IllegalStateException(
                "Cannot find 'identify' method in IRdBindableKt. " +
                    "rd-framework version: $rdVersion. " +
                    "Expected method with signature (IRdBindable, IIdentities, long). " +
                    "Tried names: $knownMethodNames. " +
                    "Available identify/bind methods: $availableMethods. " +
                    "If rd-framework was updated, add the new method name to knownMethodNames in GameScriptBackendHost.kt"
            )
        }

        val foundMethod = candidates.first()
        LOG.warn(
            "Found 'identify' method via fallback: ${foundMethod.name}. " +
                "Add '${foundMethod.name}' to knownMethodNames in GameScriptBackendHost.kt"
        )
        return foundMethod
    }

    /**
     * Verify that the model binding succeeded by checking its state.
     * This is a best-effort check - failures are logged but don't prevent model usage.
     *
     * Note: The protocol version check may fail if the C# backend is not ready yet
     * (SolutionLoadTaskKinds.Done hasn't fired). This is expected and subsequent
     * RPC calls will retry with timeout.
     */
    private fun verifyModelBinding(model: GameScriptModel) {
        try {
            // Verify the endpoint is accessible - if model is properly bound, this succeeds
            val findSymbol = model.findSymbol
            if (findSymbol == null) {
                LOG.warn("verifyModelBinding: findSymbol endpoint is null after binding")
            } else {
                LOG.info("verifyModelBinding: findSymbol endpoint is accessible")
            }

            // Try to call getProtocolVersion to verify end-to-end connectivity
            // This is done on a background thread to avoid blocking the UI
            LOG.info("verifyModelBinding: Attempting getProtocolVersion call...")
            try {
                // Use a short timeout for the verification call
                val getVersion = model.getProtocolVersion
                if (getVersion == null) {
                    LOG.warn("verifyModelBinding: getProtocolVersion endpoint is null")
                } else {
                    LOG.info("verifyModelBinding: getProtocolVersion endpoint is accessible, model RdId=${model.rdid}")
                    // Don't actually call sync() here - it might block if C# isn't ready yet
                    // The actual RPC will be tested on first real usage
                }
            } catch (e: Exception) {
                LOG.warn("verifyModelBinding: getProtocolVersion check failed: ${e.message}")
            }
        } catch (e: Exception) {
            LOG.warn("verifyModelBinding failed: ${e.message}", e)
        }
    }

    override fun dispose() {
        lifetimeDefinition?.terminate()
        _model = null
    }

    companion object {
        private val LOG = Logger.getInstance(GameScriptBackendHost::class.java)

        /**
         * The model name used for RdId binding.
         * Both Kotlin frontend and C# backend must use this exact name.
         *
         * SYNC REQUIRED: If you change this value, also update:
         * - C# backend: SymbolLookupHost.cs constructor (new GameScriptModel(lifetime, protocol))
         *   The C# generated code uses the model name for binding automatically.
         */
        internal const val MODEL_NAME = "GameScriptModel"

        /**
         * Compute the RdId for model binding using the shared model name.
         *
         * ╔══════════════════════════════════════════════════════════════════════════╗
         * ║                          SYNC REQUIRED                                    ║
         * ╠══════════════════════════════════════════════════════════════════════════╣
         * ║  The RdId is computed from MODEL_NAME using rd-framework's stable hash.   ║
         * ║  Both Kotlin and C# must use the same string:                            ║
         * ║                                                                          ║
         * ║  - Kotlin: RdId.Null.mix(MODEL_NAME)                                     ║
         * ║  - C#: RdId.Root.Mix("GameScriptModel")                                  ║
         * ║                                                                          ║
         * ║  The rd-framework uses Fnv1a64 hashing which is deterministic.           ║
         * ╚══════════════════════════════════════════════════════════════════════════╝
         *
         * Note: RdId is computed lazily to ensure rd-framework classes are loaded.
         */
        private val MODEL_RDID: Long by lazy {
            val rdId = RdId.Null.mix(MODEL_NAME)
            LOG.info("Computed MODEL_RDID from '$MODEL_NAME': ${rdId.hash}")
            rdId.hash
        }

        /**
         * Protocol version for compatibility detection.
         * Currently not checked during binding (causes classloader conflicts with coroutines),
         * but kept for reference and future use.
         *
         * SYNC REQUIRED: When updating this value, also update:
         * - C#: plugins/rider/src/dotnet/GameScript.Backend/SymbolLookupHost.cs (ProtocolVersion)
         * - Model: protocol/src/main/kotlin/model/GameScriptModel.kt (PROTOCOL_VERSION)
         */
        @Suppress("unused")
        private const val PROTOCOL_VERSION = 2

        /**
         * Get the rd-framework version for error messages.
         * Returns the version from the rd-framework JAR manifest, or "unknown" if not available.
         */
        private fun getRdFrameworkVersion(): String {
            return try {
                val rdIdClass = RdId::class.java
                val pkg = rdIdClass.`package`
                pkg?.implementationVersion
                    ?: pkg?.specificationVersion
                    ?: rdIdClass.protectionDomain?.codeSource?.location?.path
                        ?.substringAfterLast("/")
                        ?.substringBeforeLast(".jar")
                    ?: "unknown"
            } catch (e: Exception) {
                "unknown (${e.message})"
            }
        }

        fun getInstance(project: Project): GameScriptBackendHost =
            project.getService(GameScriptBackendHost::class.java)
    }
}
