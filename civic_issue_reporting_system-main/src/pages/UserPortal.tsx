// Citizen Portal — accessible at /user
// Renders the full App in citizen-only mode.
// Admin accounts logged in here will be redirected to /admin.
import App from '../App';

export default function UserPortal() {
  return <App forcePortal="user" />;
}
