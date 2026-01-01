/**
 * AG-Grid Enterprise module registration.
 *
 * Call initializeGrid() once at app startup before using any AG-Grid components.
 */

import { ModuleRegistry } from '@ag-grid-community/core';
import { InfiniteRowModelModule } from '@ag-grid-community/infinite-row-model';
import { ColumnsToolPanelModule } from '@ag-grid-enterprise/column-tool-panel';
import { EnterpriseCoreModule, LicenseManager } from '@ag-grid-enterprise/core';
import { FiltersToolPanelModule } from '@ag-grid-enterprise/filter-tool-panel';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { SideBarModule } from '@ag-grid-enterprise/side-bar';
import { SetFilterModule } from '@ag-grid-enterprise/set-filter';

// AG-Grid styles - must be imported for grid to render correctly
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-quartz.css';

// AG-Grid Enterprise license key for GameScript
// Valid until April 4, 2025
const AG_GRID_LICENSE_KEY =
  'Using_this_{AG_Grid}_Enterprise_key_{AG-057810}_in_excess_of_the_licence_granted_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_changing_this_key_please_contact_info@ag-grid.com___{Short_Sleeve_Studio}_is_granted_a_{Single_Application}_Developer_License_for_the_application_{GameScript}_only_for_{1}_Front-End_JavaScript_developer___All_Front-End_JavaScript_developers_working_on_{GameScript}_need_to_be_licensed___{GameScript}_has_been_granted_a_Deployment_License_Add-on_for_{1}_Production_Environment___This_key_works_with_{AG_Grid}_Enterprise_versions_released_before_{4_April_2025}____[v3]_[01]_MTc0MzcyMTIwMDAwMA==2287fa2a93039a849b1cdb4ada281e2e';

let initialized = false;

/**
 * Initialize AG-Grid with Enterprise modules.
 * Call this once at app startup.
 */
export function initializeGrid(): void {
  if (initialized) return;
  initialized = true;

  // Set license key
  LicenseManager.setLicenseKey(AG_GRID_LICENSE_KEY);

  // Register modules
  ModuleRegistry.registerModules([
    EnterpriseCoreModule,
    InfiniteRowModelModule,
    SideBarModule,
    ColumnsToolPanelModule,
    FiltersToolPanelModule,
    MenuModule,
    SetFilterModule,
  ]);
}

/**
 * Check if AG-Grid has been initialized.
 */
export function isGridInitialized(): boolean {
  return initialized;
}
