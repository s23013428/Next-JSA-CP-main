import { loadUserPanel } from "./actions";
import { AccountPanel } from "./panel";

export const instant = false;

export default async function AccountPage() {
  const { user, bookings } = await loadUserPanel();
  return <AccountPanel user={user} initialBookings={bookings} />;
}
