import { Request } from 'express';

export interface User {
    id: number;
    username: string;
    password?: string;
}

export interface Group {
    id: number;
    userId: number;
    name: string;
    position: number;
}

export interface Tile {
    id: number;
    userId: number;
    groupId: number | null;
    name: string;
    url: string;
    icon: string;
    position: number;
}

export interface DatabaseRunResult {
    lastID: number;
    changes: number;
}

export interface AuthRequest extends Request {
    user?: User;
}
