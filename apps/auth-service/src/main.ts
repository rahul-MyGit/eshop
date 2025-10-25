import express, { Response} from 'express';
import cors from "cors"
import { errorMiddleware } from '../../../packages/error-handler/error-middlware';
import cookieParser from 'cookie-parser';
import router from './routes/auth.routes';
import swaggerUi from "swagger-ui-express";

const swaggerDocument = require("../../../src/swagger-output.json")

const app = express();

app.use(cors({
    origin: ["http://localhost:3000"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.get('/', (_, res: Response) => {
    res.send({ 'message': 'Hello from auth service'});
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use("/docs-json", (_, res) => {
    res.json(swaggerDocument)
})

app.use("/api", router)
app.use(errorMiddleware);


const port = process.env.PORT ? Number(process.env.PORT) : 6001;
const server = app.listen(port, () => {
    console.log(`Auth-Service running at http://localhost:${port}/api`);
    console.log(`Docs available at http://localhost:${port}/docs`)
});


server.on("error", (error) => {console.log("Server Error", error)})