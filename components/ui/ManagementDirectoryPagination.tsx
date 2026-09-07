import TablePagination, { type TablePaginationProps } from './TablePagination';

/**
 * Runtime marker remains: data-ui-management-directory-pagination="shared".
 * Backward-compatible directory name. All directory pagination now delegates
 * to the canonical table pagination primitive.
 */
export type ManagementDirectoryPaginationProps = TablePaginationProps;
export default TablePagination;
