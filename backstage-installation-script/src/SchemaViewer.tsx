import React from 'react';
import { SchemaViewer } from '@miman/json-schema-viewer-react';

export const EntitySchemaViewer = ({ schema }: { schema: string | any }) => {
  const parsedSchema = React.useMemo(() => {
    if (typeof schema !== 'string') return schema;
    try {
      return JSON.parse(schema);
    } catch (e) {
      console.error('JSON Schema Viewer parse error:', e);
      return null;
    }
  }, [schema]);

  if (!parsedSchema) {
    return React.createElement('pre', null, typeof schema === 'string' ? schema : 'Invalid schema');
  }

  const [isReady, setIsReady] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!parsedSchema) return;

    // Delay rendering to ensure the parent container (Backstage tabs/layout) 
    // has settled its measurements before any manual DOM manipulation occurs.
    const timer = setTimeout(() => {
      // Defensive check: Only render if we are actually visible.
      // material-table crashes if peers render while hidden/measuring.
      if (wrapperRef.current && wrapperRef.current.offsetParent !== null) {
        setIsReady(true);
      }
    }, 20);

    return () => clearTimeout(timer);
  }, [parsedSchema]);

  if (!isReady) {
    return React.createElement('div', { 
      ref: wrapperRef, 
      style: { minHeight: '500px', width: '100%', position: 'relative' } 
    });
  }

  return (
    <div ref={wrapperRef} className="json-schema-viewer-container" style={{ minHeight: '500px', width: '100%', position: 'relative' }}>
      <SchemaViewer
        schema={parsedSchema}
        bundle={{}}
      />
    </div>
  );
};
