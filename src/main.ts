import { createNestApp } from './bootstrap';

async function bootstrap() {
  const app = await createNestApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running locally on http://localhost:${port}`);
  });
}

bootstrap();
