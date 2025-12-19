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

    // By the time useEffect runs, the component has been mounted and painted.
    // At this point, it is safe to perform DOM manipulations. The parent
    // component is already using IntersectionObserver to ensure this component
    // is not mounted at all until it's visible.
    renderSchemaInto(containerRef.current, options);

    // The renderSchemaInto function replaces the container's innerHTML.
    // There is no specific cleanup needed for the content it creates,
    // as it will be removed from the DOM when this div is unmounted.
  }, [options]);

  return <div ref={containerRef} className={props.className} />;
}
