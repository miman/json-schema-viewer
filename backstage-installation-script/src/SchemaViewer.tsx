import React from 'react';
import { SchemaViewer } from '@miman/json-schema-viewer-react';

export const EntitySchemaViewer = ({ schema = {} }: { schema?: any }) => {
  return (
    <SchemaViewer
      schema={schema}
      // Optional: provide external references if needed
      bundle={{}}
    />
  );
};
