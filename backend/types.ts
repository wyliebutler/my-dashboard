import { Request } from 'express';

export interface User {
    id: number;
    username: string;
}

export interface AuthRequest extends Request {
    user?: User;
}
