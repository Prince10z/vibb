import React from "react";

const OutlinedButton = ({ text }) => {
  return (
    <button className="rounded-lg bg-[#ffffff35] text-white h-10 px-5">
      {text}
    </button>
  );
};

export default OutlinedButton;
