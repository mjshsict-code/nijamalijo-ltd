export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  createdAt: string;
}

export interface Appointment {
  id?: string;
  userId: string;
  department: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  description: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

export interface Report {
  id?: string;
  userId: string;
  appointmentId?: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl: string;
}
