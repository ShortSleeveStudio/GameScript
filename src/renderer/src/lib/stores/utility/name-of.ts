/**Used to ensure references to column names are checked for validity */
export const nameof = <T>(name: Extract<keyof T, string>): string => name;
