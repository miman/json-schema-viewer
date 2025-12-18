import { useEffect, useMemo, useRef } from 'react';
import { ensureSchemaViewerStyles } from '../styles/ensureStyles';
import type { SchemaBundle } from '../viewerCore';
import { renderSchemaInto } from '../viewerDom';

export type SchemaViewerProps = {
  schema: any;
  bundle?: SchemaBundle;
  importedFileNames?: string[];
  missingFileNames?: string[];
  className?: string;
};

export function SchemaViewer(props: SchemaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(
    () => ({
      schema: props.schema,
      bundle: props.bundle ?? {},
      importedFileNames: props.importedFileNames ?? [],
      missingFileNames: props.missingFileNames ?? [],
    }),
    [props.schema, props.bundle, props.importedFileNames, props.missingFileNames]
  );

  useEffect(() => {
    ensureSchemaViewerStyles();
    if (!containerRef.current) return;
    renderSchemaInto(containerRef.current, options);
  }, [options]);

  return <div ref={containerRef} className={props.className} />;
}
