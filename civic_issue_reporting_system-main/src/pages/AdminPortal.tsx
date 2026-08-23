// Admin Portal — accessible at /admin
// Renders the full App in admin-only mode.
// Non-admin accounts are blocked and shown the admin login screen.
import App from '../App';

export default function AdminPortal() {
  return <App forcePortal="admin" />;
}
