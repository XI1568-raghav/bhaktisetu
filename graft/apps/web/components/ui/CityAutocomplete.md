# apps\web\components\ui\CityAutocomplete.tsx

- Props · interface · L7-L13 — Defines the controlled-input contract for CityAutocomplete, requiring the selected city record and a change callback so parent forms can capture the choice.
- CityAutocomplete · function · L15-L160 — Renders a searchable city combobox that only accepts cities present in the database, surfacing a confirmation chip for valid picks and a warning for unknown ones.
- handleInput · function · L50-L55 — Keeps the selection honest by clearing any previously chosen city the moment the user edits the text, then re-running the search.
- handleKeyDown · function · L57-L73 — Implements keyboard navigation of the dropdown so arrow keys move the highlight and Enter/Tab commits the highlighted city.
- handler · function · L77-L81 — Closes the dropdown when the user clicks anywhere outside the component.
