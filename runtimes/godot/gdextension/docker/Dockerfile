FROM emscripten/emsdk:3.1.64

RUN apt-get update && apt-get install -y --no-install-recommends \
    scons \
    g++ \
    python3 \
    git \
    ca-certificates \
    mingw-w64 \
    g++-mingw-w64-x86-64 \
 && update-alternatives --set x86_64-w64-mingw32-gcc /usr/bin/x86_64-w64-mingw32-gcc-posix \
 && update-alternatives --set x86_64-w64-mingw32-g++ /usr/bin/x86_64-w64-mingw32-g++-posix \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /work
