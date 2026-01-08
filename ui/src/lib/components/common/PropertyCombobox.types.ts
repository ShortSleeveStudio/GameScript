/** Payload type for the onchange callback */
export interface PropertyComboboxChangePayload {
    isCustom: boolean;
    referenceValueId: number | null;
    customValue: string | number | boolean | null;
}
