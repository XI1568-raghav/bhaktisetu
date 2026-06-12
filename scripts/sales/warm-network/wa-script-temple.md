# WhatsApp script — Temple referral ask

> **Purpose**: ask warm contact to introduce a verified temple manager / temple trustee / poojari in their city or village.
> **Send from**: founder's personal WhatsApp (NOT business broadcast). Manual paste per contact.
> **Tone**: personal, specific, low-ask. No marketing language. Reference shared memory.

## Variant A — close friend / family

```
{Name} bhai/ji, ek chhoti si help maangni hai.

Main Bhaktisetu chala raha hoon — verified temples ko devotees se connect karte hain (live darshan + puja + video proof). Currently humare paas verified temples kam hain, aur supply build karna sabse bada bottleneck hai.

Aapko {city/village} mein koi temple trustee ya poojari pata hai jo:
  (a) regular puja services offer karte hain
  (b) tech-friendly hain (WhatsApp pe at least kaam karte hain)
  (c) honest + trustworthy aapki nazar mein

Agar haan, toh meri taraf se ek intro kar dein — phone number ya WA hi enough hai, baat main karunga.

Kuch nahi mila toh bhi koi baat nahi. Bas asked karna chahta tha.

— {founder name}
```

**When to use**: relationship ≥ 5 years OR family.
**Reply tracking**: log to `warm-network-tracker.csv` → `script_variant: temple-A`.

## Variant B — distant connection / LinkedIn 1st-degree

```
Hi {Name},

Founder of Bhaktisetu here — we connect devotees with verified temples in India (live darshan + remote puja booking + video proof of completion).

We're building our verified-temple supply network and currently have a gap in {city / region}. Knowing your link to {their context — alumni / company / temple visit}, thought I'd ask:

Do you know a temple manager, trustee, or senior pandit in {city} who runs regular puja services and might be open to a 10-min intro call about partnering with us? We pay temples 60-80% commission per puja, all on 80G rails.

No pressure if not — happy to send you our deck for your own browsing if you're curious about what we're building.

Best,
{founder name}
Bhaktisetu Foundation
```

**When to use**: relationship < 2 years OR LinkedIn 1st-degree no recent interaction.
**Reply tracking**: log to `warm-network-tracker.csv` → `script_variant: temple-B`.

## Variant C — devotee in your community

```
{Name} ji, ek baat puchhni thi.

Aap {community temple / cultural group} mein active hain — kya wahaan ya aas-paas koi temple trustee hai jisko Bhaktisetu jaisi platform interest kar sakti hai?

Hum verified temples ko devotees se connect karte hain — live darshan, remote puja w/ video proof, NRI USD billing 80G eligible. Temple ko 60-80% commission milti hai, hum sab tech + ops handle karte hain.

Agar koi mind mein aata hai, ek intro kara dein. Agar nahi, koi baat nahi.

Hari ka kaam ke saath, dhanyavad.

— {founder name}
```

**When to use**: devotee in same Sanatan / community / Iskcon / Art-of-Living / mandir circle.
**Reply tracking**: log to `warm-network-tracker.csv` → `script_variant: temple-C`.

## Post-reply follow-up (if positive)

```
Bahut shukriya {Name} ji!

Main {referee name} ko {phone / WA / email} pe contact karta hoon, aur aapka reference mention karunga. Update aapko 7 din mein dunga.

— {founder name}
```

## Post-reply follow-up (if negative or silent after 7 days)

No re-ping. Move on. Log `replied_at` as `silent` in tracker. Asking twice damages the relationship.
