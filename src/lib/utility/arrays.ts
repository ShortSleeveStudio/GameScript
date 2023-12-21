/**Comparator for sorted array */
export type Comparator<T> = (left: T, right: T) => number;

/**Search a sorted array */
export function sortedIndexOf<T>(array: Array<T>, value: T, compare: Comparator<T>) {
    let first: number = 0;
    let last: number = array.length - 1;
    while (first <= last) {
        const middle = (first + last) >> 1; // Math.floor( / 2)
        const comparison = compare(value, array[middle]);
        if (comparison > 0) {
            first = middle + 1;
        } else if (comparison < 0) {
            last = middle - 1;
        } else {
            return middle;
        }
    }
    return -(first + 1);
}
