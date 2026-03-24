import express, { Response } from 'express';
import os from 'os';

const router = express.Router();

router.get('/stats', (req: express.Request, res: Response) => {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const cpuUsage = (loadAvg[0] / cpuCount) * 100;

    res.json({
        cpu: cpuUsage.toFixed(1),
        mem: memUsage.toFixed(1),
        uptime: os.uptime()
    });
});

export default router;
