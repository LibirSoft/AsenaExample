import { Server } from 'asena/src';
import {logger} from "./utils/logger.ts";

const server = new Server().logger(logger).port(3000);

await server.start();