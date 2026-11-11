export type User = { id: string; name: string; username: string | null; role: "DEV" | "ADMIN" | "PARTNER" };
export type Dashboard = {active:number;pending:number;inactive:number;people:number;partners:number;attendances:number;updatedAt:string};
