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
    const currentRef = wrapperRef.current;
    if (!parsedSchema || !currentRef) return;

    // The IntersectionObserver is a more reliable way to detect when a component
    // is actually visible on screen, especially in a complex layout with tabs
    // like Backstage. It avoids the race condition of a fixed setTimeout.
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the component is intersecting (i.e., visible on screen),
        // we can safely render the schema viewer.
        if (entry.isIntersecting) {
          setIsReady(true);
          // We only need to run this once, so disconnect the observer.
          observer.disconnect();
        }
      },
      // threshold: 0.1 means the callback will trigger when at least 10%
      // of the element is visible.
      { threshold: 0.1 },
    );

    observer.observe(currentRef);

    return () => {
      // Clean up the observer when the component unmounts.
      observer.disconnect();
    };
  }, [parsedSchema]);

  if (!isReady) {
    // This placeholder div is observed. When it becomes visible,
    // isReady is set to true and the real component renders.
    return React.createElement('div', {
      ref: wrapperRef,
      style: { minHeight: '500px', width: '100%', position: 'relative' },
    });
  }

  return (
    <div className="json-schema-viewer-container" style={{ minHeight: '500px', width: '100%', position: 'relative' }}>
      <SchemaViewer schema={parsedSchema} bundle={{}} />
    </div>
  );
};
