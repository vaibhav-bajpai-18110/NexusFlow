# NexusFlow frontend

The frontend is a React single-page app built with Vite. React Flow powers the interactive workflow preview.

## Development

From the repository root, move into `frontend/` before running npm commands:

```sh
cd frontend
npm install
npm run dev
```

Vite prints the local URL after the development server starts. Create a production build with `npm run build` and serve it locally with `npm run preview`.

## Structure

- `src/App.jsx` contains the dashboard shell and view state.
- `src/components/Sidebar.jsx` and `MetricCard.jsx` provide reusable dashboard pieces.
- `src/components/WorkflowCanvas.jsx` contains the React Flow canvas and sample nodes.
- `src/index.css` contains the shared theme and responsive layout.
