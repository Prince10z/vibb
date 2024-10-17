import { createContext, useState } from "react";
const themeContext = createContext(null);

const ThemeProvider = (props) => {
  const [theme, setTheme] = useState("light");
  return (
    <themeContext.Provider value={(theme, setTheme)}>
      {props.children}
    </themeContext.Provider>
  );
};
