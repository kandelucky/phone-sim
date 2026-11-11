// features/keyboard.js: a text field. A tap on it brings the keyboard up (in the simulator too) and the screen gets
// shorter; Save or Enter on the keyboard sends the form. The name is saved by features/data.js (demo.name).
(function () {
  "use strict";

  Demo.add({
    id: "keyboard", group: "phone", title: "Keyboard", hint: "A field and Enter", icon: "keyboard", color: "accent",
    lead: "A tap on a field brings the keyboard up, and the screen gets shorter.",
    can: [
      ["type", "accent", "Type your name", "Up to 24 characters."],
      ["enter", "primary", "Enter or Save", "Sends the form and puts the keyboard away."],
      ["home", "success", "Hello", "The name is saved; the home screen says hello to it."]
    ],
    sim: [
      ["keyboard", "A keyboard comes up and the screen gets shorter, as on a phone."],
      ["type", "Its keys type: [⇧] one capital, [⌫] erases, [↵] sends the form. The PC keyboard types too."],
      ["back", "[◁] puts the keyboard away first."],
      ["terminal", "The console writes the saved name."]
    ],
    tip: ["watch", "the screen gets shorter: a field low on the screen must stay in view above the keyboard."],
    foot: "`enterkeyhint` names the keyboard's Enter key; a `<form>` makes Enter send it.",
    code: [
      { file: "features/keyboard.js", tag: "HTML",
        title: "The field",
        rows: [
          ["enter", "`enterkeyhint` names the keyboard's Enter key: done, go, next, search, send."],
          ["window", "A `<form>` makes Enter send it."],
          ["ban", "`autocomplete=\"off\"`: no suggestions from earlier."]
        ],
        src:
'<form id="nameForm">\n' +
'  <input id="nameIn" enterkeyhint="done" autocomplete="off">\n' +
'  <button>Save</button>\n' +
'</form>' },
      { file: "features/keyboard.js", tag: "Web API",
        title: "Sending it",
        rows: [
          ["ban", "`preventDefault`: no page reload."],
          ["save", "`demo.name()` saves it (features/data.js)."],
          ["keyboard", "`blur()` puts the keyboard away."]
        ],
        src:
'nameForm.onsubmit = function (e) {\n' +
'  e.preventDefault();\n' +
'  demo.name(nameIn.value);      // saves it (features/data.js)\n' +
'  nameIn.blur();                // the keyboard goes away\n' +
'};' }
    ],
    build: function (pane) {
      pane.innerHTML =
        '<form class="join w-full">' +
          '<input type="text" class="input join-item flex-1 min-w-0" placeholder="Your name" maxlength="24" autocomplete="off" enterkeyhint="done">' +
          '<button class="btn btn-primary join-item">Save</button>' +
        '</form>';
      var form = pane.querySelector("form"), field = pane.querySelector("input");
      field.value = Demo.savedName ? Demo.savedName() : "";
      Demo.on("name", function (n) { if (document.activeElement !== field) field.value = n; });
      form.onsubmit = function (e) {
        e.preventDefault();
        if (window.demo && demo.name) demo.name(field.value);
        field.blur();
      };
    }
  });
})();
