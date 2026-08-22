import React from 'react';

import ManagementDirectoryToolbar, {
  type ManagementDirectoryToolbarFilter,
  type ManagementDirectoryToolbarOption,
  type ManagementDirectoryToolbarProps,
} from '@/components/ui/ManagementDirectoryToolbar';

export type PeopleDirectoryToolbarOption = ManagementDirectoryToolbarOption;
export type PeopleDirectoryToolbarFilter = ManagementDirectoryToolbarFilter;

type PeopleDirectoryToolbarProps = ManagementDirectoryToolbarProps;

const PeopleDirectoryToolbar: React.FC<PeopleDirectoryToolbarProps> = (props) => (
  <div data-ui-people-toolbar="shared" data-ui-people-filters="true">
    <ManagementDirectoryToolbar {...props} />
  </div>
);

export default PeopleDirectoryToolbar;
