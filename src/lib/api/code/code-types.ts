/**List of supported programming languages */
export const PROGRAMMING_LANGUAGES = ['C#', 'C++'] as const;

/**Database data type */
export type ProgrammingLanguages = (typeof PROGRAMMING_LANGUAGES)[number];
