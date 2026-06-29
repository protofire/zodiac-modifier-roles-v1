import React from "react"
import ReactDOM from "react-dom"
import { ThemeProvider } from "styled-components"
import { CssBaseline, ThemeProvider as MUIThemeProvider } from "@material-ui/core"
import { zodiacMuiTheme } from "zodiac-ui-components"
import { theme as gnosisStyledComponentsTheme } from "@gnosis.pm/safe-react-components"
import App from "./components/App"
import { RolesGlobalStyles } from "./theme/RolesGlobalStyles"
import { Provider as ReduxProvider } from "react-redux"
import { REDUX_STORE } from "./store"
import { initRegistry } from "./chains/registry"

const Main = () => {
  return (
    <MUIThemeProvider theme={zodiacMuiTheme}>
      <ThemeProvider theme={gnosisStyledComponentsTheme}>
        <CssBaseline />
        <RolesGlobalStyles />
        <ReduxProvider store={REDUX_STORE}>
          <App />
        </ReduxProvider>
      </ThemeProvider>
    </MUIThemeProvider>
  )
}

// Seed chain metadata before first render. initRegistry never throws; render regardless.
initRegistry().finally(() => {
  ReactDOM.render(
    <React.StrictMode>
      <Main />
    </React.StrictMode>,
    document.getElementById("root"),
  )
})
