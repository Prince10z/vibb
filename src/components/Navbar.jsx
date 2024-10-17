import React from "react";
import OutlinedButton from "./OutlinedButton";

const Navbar = () => {
  return (
    <div className="text-white bg-black h-16 flex flex-row  items-center justify-around text-sm font-bold font-[Helvetica,Arial,sans-serif]">
      <OutlinedButton text="Log In" />
      <OutlinedButton text="test" />
    </div>
  );
};

export default Navbar;
