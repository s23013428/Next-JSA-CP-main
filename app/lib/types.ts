export type SlotStatus = "Available" | "Booked" | "Maintenance";

export type FacilityView = {
  id: number;
  name: string;
  sport: "Badminton" | "Cricket" | "Football";
  rate: string;
  rateValue: number;
  description: string;
  ground: string;
  whatsapp: string;
  status: "active" | "maintenance" | "inactive";
  slots: Array<{ time: string; status: SlotStatus }>;
};

export type BookingView = {
  id: number;
  ref: string;
  facility: string;
  when: string;
  customer: string;
  contact: string;
  status: "Pending" | "Confirmed" | "Rejected" | "Cancelled";
};

export type FacilityAdminView = {
  id: number;
  name: string;
  sport: "Badminton" | "Cricket" | "Football";
  ground: string;
  rate: string;
  status: "active" | "maintenance" | "inactive";
};
