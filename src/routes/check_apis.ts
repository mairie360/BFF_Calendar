import { Router } from 'express';
import axios from 'axios'; // La lib utilisée

const router = Router();

// Récupération des variables d'environnement
const core_api_url = process.env.CORE_API_URL;
const core_api_port = process.env.CORE_API_PORT;

const calendar_api_url = process.env.CALENDAR_API_URL;
const calendar_api_port = process.env.CALENDAR_API_PORT;

const CORE_FULL_URL = `http://${core_api_url}:${core_api_port}`;
const CALENDAR_FULL_URL = `http://${calendar_api_url}:${calendar_api_port}`;

router.get('/', async (_, res) => {
  try {
    const coreResponse = await axios.get(`${CORE_FULL_URL}/health`, { timeout: 5000 });
    console.log(coreResponse);
    const core_is_reachable = coreResponse.status === 200;
    
    const calendarResponse = await axios.get(`${CALENDAR_FULL_URL}/health`, { timeout: 5000 });
    console.log(calendarResponse);
    const calendar_is_reachable = calendarResponse.status === 200;
    
    res.status(200).json({
      status: 'OK',
      core_api: core_is_reachable ? 'Connected' : 'Unreachable',
      calendar_api: calendar_is_reachable ? 'Connected' : 'Unreachable',
      details: {
        core: coreResponse.data,
        calendar: calendarResponse.data
      }
    });
  } catch (error) {
    res.status(502).json({
      status: 'Error',
      core_api: 'Unreachable',
      calendar_api: 'Unreachable',
      message: (error as Error).message
    });
  }
});

export default router;