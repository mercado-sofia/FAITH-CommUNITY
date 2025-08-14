import React from "react";
import DatePicker from "../../../build/index";

export default function Doc({ otherProps, localeImport }) {
  const green = {
    title: "Green",
    code: `${localeImport}import "react-multi-date-picker/styles/colors/green.css"
.
.
.
<DatePicker 
  className="green"
/>`,
    jsx: <DatePicker className="green" {...otherProps} />,
  };

  const red = {
    title: "Red",
    code: `${localeImport}import "react-multi-date-picker/styles/colors/red.css"
.
.
.
<DatePicker 
  className="red"
/>`,
    jsx: <DatePicker className="red" {...otherProps} />,
  };

  const yellow = {
    title: "Yellow",
    code: `${localeImport}import "react-multi-date-picker/styles/colors/yellow.css"
.
.
.
<DatePicker 
  className="yellow"
/>`,
    jsx: <DatePicker className="yellow" {...otherProps} />,
  };

  const purple = {
    title: "Purple",
    code: `${localeImport}import "react-multi-date-picker/styles/colors/purple.css"
.
.
.
<DatePicker 
  className="purple"
/>`,
    jsx: <DatePicker className="purple" {...otherProps} />,
  };

  const teal = {
    title: "Teal",
    code: `${localeImport}import "react-multi-date-picker/styles/colors/teal.css"
.
.
.
<DatePicker 
  className="teal"
/>`,
    jsx: <DatePicker className="teal" {...otherProps} />,
  };

  const dark = {
    title: "Background Dark",
    code: `${localeImport}import "react-multi-date-picker/styles/backgrounds/bg-dark.css"
.
.
.
<DatePicker 
  className="bg-dark"
/>`,
    jsx: <DatePicker className="bg-dark" {...otherProps} />,
  };

  const gray = {
    title: "Background Gray",
    code: `${localeImport}import "react-multi-date-picker/styles/backgrounds/bg-gray.css"
.
.
.
<DatePicker 
  className="bg-gray"
/>`,
    jsx: <DatePicker className="bg-gray" {...otherProps} />,
  };

  const brown = {
    title: "Background Brown",
    code: `${localeImport}import "react-multi-date-picker/styles/backgrounds/bg-brown.css"
.
.
.
<DatePicker 
  className="bg-brown"
/>`,
    jsx: <DatePicker className="bg-brown" {...otherProps} />,
  };

  return [green, red, yellow, purple, teal, dark, gray, brown];
}
