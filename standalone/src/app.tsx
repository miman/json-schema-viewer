import { useEffect, useMemo, useState } from 'react';
import defaultSchema from '../../examples/example.schema.json';
import { SchemaViewer } from '../../web/react';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; schema: any }
  | { kind: 'error'; message: string };

function getSchemaUrlFromQuery(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('url');
}

export function App() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const schemaUrl = useMemo(() => getSchemaUrlFromQuery(), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!schemaUrl) {
          if (!cancelled) setState({ kind: 'loaded', schema: defaultSchema });
          return;
        }

        const res = await fetch(schemaUrl);
        if (!res.ok) {
          throw new Error(`Failed to load schema: ${res.status} ${res.statusText}`);
        }
        const schema = await res.json();
        if (!cancelled) setState({ kind: 'loaded', schema });
      } catch (e: any) {
        if (!cancelled) setState({ kind: 'error', message: e?.message ?? String(e) });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [schemaUrl]);

  if (state.kind === 'error') {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>JSON Schema Viewer</h1>
        <div>Could not load schema.</div>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{state.message}</pre>
        <div style={{ marginTop: 12 }}>
          Tip: pass a URL via <code>?url=https://.../schema.json</code>
        </div>
      </div>
    );
  }

  if (state.kind === 'loading') {
    return <div style={{ padding: 16 }}>Loading...</div>;
  }

  return <SchemaViewer schema={state.schema} bundle={{}} importedFileNames={[]} missingFileNames={[]} />;
}
