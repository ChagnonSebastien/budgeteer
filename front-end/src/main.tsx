import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import WithLogin from "./WithLogin"

const container = document.getElementById("root")
const root = createRoot(container!)
root.render((
  <WithLogin>
    <App/>
  </WithLogin>
))