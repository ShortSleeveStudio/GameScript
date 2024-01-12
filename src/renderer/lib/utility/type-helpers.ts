export function TypeNameToType<T, R>(name: T, index: number): R {
    return <R>{ id: index, name: name };
}
