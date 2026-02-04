import { Application } from "../app/Application.js";
import { app } from "../utils/app.js";

const App = new Application();
app('App', App);

export { App };
export default App;