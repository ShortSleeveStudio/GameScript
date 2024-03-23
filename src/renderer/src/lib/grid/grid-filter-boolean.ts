import type {
    AgPromise,
    IDoesFilterPassParams,
    IFilterComp,
    IFilterParams,
    ISimpleFilterModel,
} from '@ag-grid-community/core';

export interface BooleanFilterModel extends ISimpleFilterModel {
    /** Filter type is always `'boolean'` */
    filterType?: 'boolean';
    /**
     * The boolean value associated with the filter.
     */
    filter?: boolean | null;
}

export class BooleanFilter implements IFilterComp {
    private _gui!: HTMLDivElement;
    private _filterParams!: IFilterParams;
    private _unsetElement!: HTMLInputElement;
    private _trueElement!: HTMLInputElement;
    private _falseElement!: HTMLInputElement;
    private _filterActive!: boolean;
    private _filterChangedCallback!: (additionalEventAttributes?: unknown) => void;

    getGui(): HTMLElement {
        return this._gui;
    }

    // destroy?(): void {
    //     throw new Error('Method not implemented.');
    // }

    init?(params: IFilterParams): void | AgPromise<void> {
        this._filterParams = params;
        this._gui = document.createElement('div');
        this._gui.innerHTML = `<div class="grid-boolean-filter">
                <label>
                    <input type="radio" name="boolean-filter" id="boolean-filter-unset" checked="true"/>Unset</label>
                </label>
                <label>
                    <input type="radio" name="boolean-filter" id="boolean-filter-false" filter-checkbox="true">False</label>
                </label>
                <label>
                    <input type="radio" name="boolean-filter" id="boolean-filter-true"/>True</label>
                </label>
            </div>`;
        this._unsetElement = this._gui.querySelector('#boolean-filter-unset');
        this._falseElement = this._gui.querySelector('#boolean-filter-false');
        this._trueElement = this._gui.querySelector('#boolean-filter-true');
        this._unsetElement.addEventListener('change', this.onRadioChanged.bind(this));
        this._falseElement.addEventListener('change', this.onRadioChanged.bind(this));
        this._trueElement.addEventListener('change', this.onRadioChanged.bind(this));
        this._filterActive = false;
        this._filterChangedCallback = params.filterChangedCallback;
    }

    isFilterActive(): boolean {
        return this._filterActive;
    }

    getModel(): BooleanFilterModel {
        return <BooleanFilterModel>{
            filterType: 'boolean',
            type: 'equals',
            filter: this._filterActive ? this._trueElement.checked : null,
        };
    }

    setModel(model: BooleanFilterModel): void | AgPromise<void> {
        if (model.filter === null) {
            this._unsetElement.checked = true;
            this._unsetElement.dispatchEvent(new Event('change'));
        } else if (model.filter === true) {
            this._trueElement.checked = true;
            this._trueElement.dispatchEvent(new Event('change'));
        } else {
            this._falseElement.checked = true;
            this._falseElement.dispatchEvent(new Event('change'));
        }
    }

    // refresh?(newParams: IFilterParams<any, any>): boolean {
    //     throw new Error('Method not implemented.');
    // }

    doesFilterPass(params: IDoesFilterPassParams): boolean {
        if (!this.isFilterActive()) return true;
        const { node } = params;
        const value: boolean | undefined = <boolean | undefined>this._filterParams.getValue(node);
        const isTrue: boolean = this._trueElement.checked;
        if (isTrue) return value;
        else return !value;
    }

    // onNewRowsLoaded?(): void {
    //     throw new Error('Method not implemented.');
    // }
    // onAnyFilterChanged?(): void {
    //     throw new Error('Method not implemented.');
    // }
    // getModelAsString?(model: any): string {
    //     throw new Error('Method not implemented.');
    // }
    // afterGuiAttached?(params?: IAfterGuiAttachedParams): void {
    //     throw new Error('Method not implemented.');
    // }
    // afterGuiDetached?(): void {
    //     throw new Error('Method not implemented.');
    // }

    private onRadioChanged(): void {
        this._filterActive = !this._unsetElement.checked;
        this._filterChangedCallback();
    }
}
