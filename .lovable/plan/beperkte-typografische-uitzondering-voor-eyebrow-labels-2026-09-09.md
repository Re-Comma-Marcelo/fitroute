# Beperkte typografische uitzondering voor eyebrow-labels

## Doel
De kleine eyebrow-labels rustiger en minder dominant maken met **Plus Jakarta Sans**, zonder de bestaande ROUTE-typografie voor koppen, titels, lopende tekst, cijfers of bediening te vervangen.

## Wijzigingen
1. **Plus Jakarta Sans toevoegen**
   - Laad alleen de benodigde gewichten 400 en 500 naast de bestaande Archivo- en Chivo-fonts.
   - Voeg een apart semantisch font-token toe voor eyebrow-labels; wijzig de bestaande display- en bodytokens niet.

2. **Gedeelde eyebrow-stijl verfijnen**
   - Pas `label-caps` aan naar Plus Jakarta Sans.
   - Gebruik regular/medium gewicht in plaats van bold.
   - Verminder de letterspatiëring duidelijk, terwijl uppercase en het kleine labelformaat behouden blijven.

3. **Losse labelvarianten gelijk trekken**
   - Vervang lokale kleine uppercase/tracking-labelstijlen door dezelfde semantische eyebrow-stijl waar ze dezelfde functie vervullen.
   - Laat badges, invoerveldlabels, navigatie, knoppen en Display/Title-koppen ongemoeid wanneer ze geen eyebrow zijn.

4. **Brandbook-uitzondering documenteren**
   - Leg vast dat Plus Jakarta Sans uitsluitend is toegestaan voor kleine eyebrow-labels als bewuste leesbaarheids- en hiërarchie-uitzondering.
   - Bevestig expliciet dat Archivo de displayfamilie en Chivo de primaire interface/bodyfamilie blijven.

5. **Visuele controle**
   - Controleer Home en enkele representatieve schermen op mobiel formaat.
   - Verifieer dat labels rustiger ogen, niet afbreken of overlappen, en dat titels en merktypografie niet zijn veranderd.

## Technische afbakening
- Alleen frontend en documentatie.
- Geen wijzigingen aan data, Supabase, functionaliteit of gebruikerscopy.
- Geen algemene fontmigratie; uitsluitend semantische eyebrow-labels.
