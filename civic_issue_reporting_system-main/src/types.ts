export interface User {
  id: string;
  username: string;
  email: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  reputationPoints: number;
  badges: string[];
}

export type IssueStatus = 
  | 'Complaint Submitted' 
  | 'Priority Assigned' 
  | 'Maintenance Team Assigned' 
  | 'Work In Progress' 
  | 'Issue Resolved' 
  | 'Confirmed Resolved' 
  | 'Reopened';

export type Priority = 'Low' | 'Medium' | 'Emergency';

export interface Issue {
  id: string;
  userId: string;
  username: string;
  category: string;
  description: string;
  imageUrl: string | null;
  workerImageUrl?: string | null;
  proofImageUrl?: string | null;
  locationAddress: string;
  latitude: number;
  longitude: number;
  priority: Priority;
  assignedTeam?: string;
  status: IssueStatus;
  timestamp: string;
  upvotes: number;
  votedBy: string[];
}

export interface Vote {
  id: string;
  issueId: string;
  userId: string;
  vote: 'Resolved Properly' | 'Not Resolved';
  proofImage?: string | null;
  comment: string;
  timestamp: string;
}
