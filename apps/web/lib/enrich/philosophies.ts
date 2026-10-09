import type { EnrichmentSet } from './types';

export const ENRICH_PHILOSOPHIES: EnrichmentSet = {
  nyaya: {
    about: [
      "Nyaya is the school of logic and method among the classical Hindu darshanas. Its root text is the Nyaya Sutras, attributed to Gautama, also called Akshapada, and it was elaborated by Vatsyayana in his commentary and by later authors such as Uddyotakara. Its central claim is that the mind can reach reliable knowledge of reality only through tested means, and that suffering is rooted in false cognition. Right understanding, reached by disciplined reasoning, is therefore the path out.",
      "Nyaya names four valid means of knowledge: perception, inference, comparison and trustworthy testimony. It is best known for its analysis of inference through a five-step argument, for its catalogue of fallacies and for its rules of debate. Liberation, called apavarga, is described as the complete ending of suffering, understood as the self's clear separation from body, mind and senses. The school also reasons toward Ishvara as the efficient cause of the world, an inference rather than a revelation, which later Nyaya thinkers defended at length.",
      "Compared with its closest neighbour, Vaisheshika, Nyaya concentrates on how we know, while Vaisheshika concentrates on what exists, and the two were eventually treated as a joint system. Compared with Mimamsa, Nyaya does not hold the Veda to be authorless, and it grounds scriptural authority in the reliability of its speaker. A later phase called Navya-Nyaya, associated with Gangesha, refined the language of logic so precisely that it influenced other schools.",
    ],
    faqs: [
      {
        q: "What are the pramanas in Nyaya?",
        a: "Nyaya accepts four: perception, inference, comparison and testimony. Each has its own conditions for being reliable, which the school studies in detail.",
      },
      {
        q: "Is Nyaya theistic?",
        a: "Yes, it argues that God exists as the efficient cause of the world, but it reaches this by inference. The belief is supported with reasoning instead of resting only on scripture.",
      },
    ],
  },
  vaisheshika: {
    about: [
      "Vaisheshika is the school of categories and atoms. It is credited to the sage Kanada, whose Vaisheshika Sutras set out to list everything that exists in a small number of fundamental kinds, the padarthas. The name comes from vishesha, meaning particularity, one of those categories. Prashastapada's later digest is the standard way into the system, and Udayana's work links it to Nyaya.",
      "The classic list names substance, quality, action, universal, particular and inherence, with absence added in later treatments, which is why some count six and others seven. Substances include earth, water, fire, air, space, time, direction, self and mind. The first four are made of indivisible atoms, and larger objects arise by their combination. In this view an effect is a genuinely new thing produced from its causes, not something already hidden in them, a stance called asatkaryavada. An unseen force called adrishta accounts for the moral consequences of action.",
      "Vaisheshika accepts only perception and inference as valid means of knowledge, which is narrower than Nyaya's list. Its idea of liberation is the self resting in its own nature, free of the qualities that arise through contact with a body, reached by correct knowledge of the categories. It differs from Samkhya, which derives the world from one primal nature, because Vaisheshika builds the world up from many separate parts. Together with Nyaya it forms the realist wing of the darshanas.",
    ],
    faqs: [
      {
        q: "What does Vaisheshika say the world is made of?",
        a: "It holds that earth, water, fire and air consist of indivisible atoms, while space, time, direction, self and mind are other kinds of substance. Everyday objects come from combinations of the atoms.",
      },
      {
        q: "How does Vaisheshika differ from Nyaya?",
        a: "Vaisheshika is mainly about ontology, the kinds of things that exist, while Nyaya is mainly about the method of knowing. Later authors often combined the two.",
      },
    ],
  },
  samkhya: {
    about: [
      "Samkhya, traditionally linked to the sage Kapila, is one of the oldest systematic philosophies of India. Its classical statement is the Samkhya Karika of Ishvarakrishna, with commentaries by Vacaspati Mishra and others, while the sutra text bearing Kapila's name is generally thought to be later. The school explains the world through two eternal principles: purusha, the conscious witness, and prakriti, the unconscious primal nature.",
      "Prakriti consists of three strands or gunas, called sattva, rajas and tamas, and from it the intellect, the sense of ego, the mind, the senses and the elements evolve in a fixed order, giving a list of twenty-five principles. Samkhya holds that the effect already exists in its cause in unmanifest form, which is the doctrine of satkaryavada, the opposite of the Vaisheshika view. Suffering, in this account, comes from failing to see that the witnessing self is quite different from everything nature produces.",
      "Liberation is called kaivalya, the isolation of purusha, and it comes through discriminative insight into that difference. The classical system is nirishvara, that is, it does not appoint a creator god, and nature unfolds for the sake of the many selves. It accepts perception, inference and reliable testimony as valid knowledge. The neighbouring school of Yoga shares this metaphysics but adds a practical discipline and a special purusha called Ishvara, and Advaita Vedanta, by contrast, rejects the plurality of selves in favour of one Brahman. Samkhya's vocabulary of gunas also runs through the Bhagavad Gita and the Puranas.",
    ],
    faqs: [
      {
        q: "What are purusha and prakriti?",
        a: "Purusha is the pure conscious witness and prakriti is unconscious nature made of three gunas. Samkhya treats both as real and eternal.",
      },
      {
        q: "Does Samkhya believe in God?",
        a: "The classical school is described as non-theistic, since it explains the world without a creator. Yoga, its close partner, does add a special purusha called Ishvara.",
      },
    ],
  },
  yoga: {
    about: [
      "As a philosophical school, Yoga is the system of Patanjali's Yoga Sutras, supported by Vyasa's commentary and the later glosses of Vacaspati Mishra and Vijnanabhikshu. It takes over the metaphysics of Samkhya, the two principles of purusha and prakriti, but its main interest is practice. The second sutra defines yoga as the stilling of the modifications of the mind, which sets the aim of the entire text.",
      "The path is set out in eight limbs: restraints, observances, posture, breath regulation, withdrawal of the senses, concentration, meditation and absorption. The text identifies five afflictions, namely ignorance, egoism, attachment, aversion and clinging to life, as the roots of suffering, and it distinguishes absorption that still carries an object of attention from absorption that does not. Posture is only a small part of the whole, and the sutras give it brief attention compared with ethics and meditation.",
      "Where Samkhya relies on discriminative knowledge alone, Yoga adds an experiential discipline, and it also accepts Ishvara as a special purusha untouched by affliction, who may serve as a focus of meditation and surrender. The goal remains kaivalya, in which the self rests in its own nature. Modern posture-based yoga draws on this tradition but is a later development, so the classical school should not be confused with it. Yoga also differs from Vedanta, which seeks knowledge of Brahman, and from Mimamsa, which centres on ritual duty.",
    ],
    faqs: [
      {
        q: "What is the eight-limbed path?",
        a: "It is Patanjali's sequence of yama, niyama, asana, pranayama, pratyahara, dharana, dhyana and samadhi. The sequence moves from ethics through body and breath to meditation.",
      },
      {
        q: "How is Yoga related to Samkhya?",
        a: "They share the same picture of purusha and prakriti. Yoga adds a method of practice and a special purusha called Ishvara.",
      },
    ],
  },
  mimamsa: {
    about: [
      "Mimamsa, more fully Purva Mimamsa, is the school of Vedic interpretation. Its root text is the Mimamsa Sutras of Jaimini, and the Shabara Bhashya is the foundational commentary. Two later lines grew from it, that of Kumarila Bhatta and that of Prabhakara. Its central claim is that the Veda is eternal and authorless, that it is self-authoritative, and that its core purpose is to enjoin right action, especially sacrifice, which is the vehicle of dharma.",
      "The school developed rules of interpretation to settle how injunctions, praise passages and mantras should be read, and these rules were later used in Hindu law and ritual practice. Ritual action is said to produce an unseen potency called apurva, which brings its result at the proper time. Mimamsa recognises up to six means of knowledge, including postulation, and the Bhatta line adds non-apprehension. It holds that knowledge is valid in itself unless something shows otherwise.",
      "On liberation, early Mimamsa was mostly silent and spoke of heavenly reward as the fruit of rites, whereas later thinkers accepted release from rebirth as the end of the process of exhausting karma. In the classical form the school did not require a creator god. It differs from Vedanta by reading the ritual portion of the Veda as primary rather than the Upanishads, and from Nyaya by denying that scripture's authority depends on a person. For this reason it is called the earlier inquiry, in contrast to Vedanta as the later one.",
    ],
    faqs: [
      {
        q: "What does Mimamsa mean by apurva?",
        a: "It is an unseen potency produced by a properly performed rite, which then delivers the result later. The idea explains why a ritual's effect is not immediate.",
      },
      {
        q: "Why is it called Purva Mimamsa?",
        a: "Purva means earlier. The school studies the earlier, ritual part of the Veda, while Vedanta, also called Uttara Mimamsa, studies the later Upanishadic part.",
      },
    ],
  },
  vedanta: {
    about: [
      "Vedanta means the end of the Veda, and the name points both to the Upanishads that close the Vedic corpus and to the school built on them. Its authoritative base is the threefold canon called the prasthana-trayi: the Upanishads, the Brahma Sutras attributed to Badarayana, and the Bhagavad Gita. The central question is the nature of Brahman, the ultimate ground of existence, and how the individual self and the world are related to it.",
      "Because the Brahma Sutras are terse, the school branched according to the commentaries written on them. Shankara's reading yields Advaita, Ramanuja's yields Vishishtadvaita, Madhva's yields Dvaita, and Chaitanya's lineage yields Achintya-bheda-abheda, among others. All claim to interpret the same texts faithfully, and they disagree about whether the world is ultimately real, whether the soul remains distinct from God, and what the freed state is like. For that reason, writing about Vedanta as one doctrine hides the debate that is the school's life.",
      "Common ground does exist. Vedanta holds that release from the cycle of birth and death comes through knowledge of Brahman, supported in most branches by devotion and discipline, and it uses a wide set of valid means of knowledge in which scriptural testimony has a special place for the highest truth. It differs from Mimamsa, which puts ritual action first, and from Samkhya, whose dualism it criticises. Modern teachers such as Radhakrishnan and the Arsha Vidya line have made the school widely read.",
    ],
    faqs: [
      {
        q: "What is the prasthana-trayi?",
        a: "It is the three-part canon of Vedanta: the Upanishads, the Brahma Sutras and the Bhagavad Gita. Each sub-school writes its commentaries on these three.",
      },
      {
        q: "Why are there several Vedanta schools?",
        a: "The Brahma Sutras are very brief, so teachers explained them in different ways. Their commentaries produced distinct views on how God, soul and world relate.",
      },
    ],
  },
  'advaita-vedanta-shankara': {
    about: [
      "Advaita Vedanta, the non-dual school, is associated with Adi Shankaracharya, who is traditionally placed in the early medieval period. He wrote commentaries on the Brahma Sutras, the principal Upanishads and the Gita, and the later line includes Vidyaranya's Panchadasi. The core claim is that Brahman alone is ultimately real, that Brahman is the same as the innermost self, and that the manifold world is a superimposition on it.",
      "The school speaks of two levels of truth: the empirical, in which the world and its transactions are real enough for living and ethics, and the ultimate, in which only Brahman remains. Bondage arises from avidya, beginningless ignorance, and the sentence from the Chandogya Upanishad, tat tvam asi, is taken to state the identity of the self with Brahman. Scripture is the main means of knowing this truth, since perception and inference cannot reach it, and qualified seekers are expected to cultivate discernment, dispassion, calm and the wish for freedom.",
      "Liberation is not a new attainment but the removal of ignorance, and it can occur in this life, which is called jivanmukti. This sets Advaita apart from Vishishtadvaita and Dvaita, both of which keep a lasting distinction between the soul and God, and from Samkhya, which holds many selves. Critics from those schools have argued against the idea of illusion, and Advaitins have replied that the world is neither fully real nor simply unreal. Teachers like Vivekananda and Chinmayananda brought it to modern audiences.",
    ],
    faqs: [
      {
        q: "What does advaita mean?",
        a: "It means not two. The school holds that the self and Brahman are not truly different, and that the sense of separation comes from ignorance.",
      },
      {
        q: "Does Advaita say the world is unreal?",
        a: "It says the world is real at the level of everyday experience but is not ultimately real in the way Brahman is. Many Advaitins describe it as neither simply real nor simply unreal.",
      },
    ],
  },
  'vishishtadvaita-ramanuja': {
    about: [
      "Vishishtadvaita, qualified non-dualism, is the philosophy of Ramanuja, the Sri Vaishnava teacher of the eleventh and twelfth centuries. His Sri Bhashya on the Brahma Sutras is the central work, supported by his Gita commentary and the Vedartha-sangraha, and the Tamil hymns of the Alvars supply its devotional voice. The school holds that Brahman, identified with Narayana, is the single supreme reality, but that Brahman is qualified by conscious selves and by matter.",
      "Selves and matter are real and are described as the body of God, a relation in which the embodied one and the body are inseparable yet not the same. This gives three real categories: God, selves and matter. Valid knowledge comes from perception, inference and scripture. Ramanuja argued against the Advaitin claim that ignorance hides a featureless Brahman, insisting that Brahman has auspicious qualities and that the world is no illusion.",
      "Liberation in this school is not the loss of individuality but eternal loving service of the Lord in Vaikuntha, where the freed soul becomes like God in knowledge and bliss without becoming identical with him. The means are bhakti, a steady loving remembrance, and prapatti, complete self-surrender, with the grace of a teacher playing a large part. Compared with Dvaita, it keeps a oneness of substance through the body relation, whereas Madhva insists on five eternal differences. Compared with Chaitanya's school, it centres on Narayana in the Vaikuntha, not Krishna in Vrindavan.",
    ],
    faqs: [
      {
        q: "What does qualified non-dualism mean?",
        a: "It means there is one Brahman, but Brahman has real attributes in the form of selves and matter that are inseparable from him. The oneness is organic, like a body with its self.",
      },
      {
        q: "What is prapatti?",
        a: "It is complete surrender to the Lord, regarded as a central path alongside bhakti in the Sri Vaishnava tradition. It places stress on divine grace.",
      },
    ],
  },
  'dvaita-madhva': {
    about: [
      "Dvaita Vedanta, the dualist school, was taught by Madhvacharya, also known as Ananda Tirtha, who is placed in the thirteenth century and is associated with Udupi. His commentary on the Brahma Sutras, the Anuvyakhyana and his other works, gathered as the Sarvamula granthas, are foundational, and Jayatirtha's Nyaya-sudha is the great later exposition. The central claim is that God and the world are really and eternally different.",
      "This is expressed in five eternal distinctions: between God and the soul, God and matter, one soul and another, soul and matter, and one piece of matter and another. Vishnu is the sole independent reality, while souls and matter are real but depend on him. The school accepts perception, inference and scripture as valid knowledge. It rejects the Advaita teaching that the self is Brahman and treats the world as fully real, not as a superimposition.",
      "Madhva also taught that souls differ in their natures, a view called taratamya, so that liberated souls enjoy bliss in differing degrees and remain servants of Vishnu. Liberation is reached through bhakti, grounded in knowledge of God's greatness, and is bestowed by the Lord's grace. One distinctive and often discussed feature is the doctrine that some souls are not destined for release, which other Vedanta schools do not share. Compared with Vishishtadvaita, it denies that souls and matter form God's body in an organic unity, and it gives the difference a more radical meaning.",
    ],
    faqs: [
      {
        q: "What are the five differences?",
        a: "They are the distinctions between God and soul, God and matter, soul and soul, soul and matter, and matter and matter. Dvaita holds all five to be eternal and real.",
      },
      {
        q: "How does Dvaita view liberation?",
        a: "It sees liberation as eternal bliss in the service of Vishnu, with each soul keeping its own identity and its own degree of joy. Grace is understood to play the decisive part.",
      },
    ],
  },
  'achintya-bheda-abheda-chaitanya': {
    about: [
      "Achintya-bheda-abheda, inconceivable difference and non-difference, is the Vedanta of the Gaudiya Vaishnava tradition that flowed from Sri Chaitanya Mahaprabhu in the fifteenth and sixteenth centuries. Chaitanya himself left little in writing, and the Six Goswamis of Vrindavan, especially Jiva Goswami in his Sat-sandarbhas, formulated the system. Baladeva Vidyabhushana's Govinda Bhashya later supplied a commentary on the Brahma Sutras, and the Bhagavata Purana is treated as the ripened fruit of the scriptures.",
      "The central claim is that the supreme Lord, identified as Krishna, and his energies, which include souls and the world, are at once different and not different. The relation is called inconceivable because reason cannot fully resolve it, much as fire and its heat are distinct yet inseparable. This stance sits between Advaita, which collapses the difference, and Dvaita, which keeps only difference. The school accepts perception and inference but holds scriptural testimony to be primary.",
      "The goal differs from that of the other branches of Vedanta. Release from rebirth is regarded as only a preliminary result, and the aim is prema, pure love of Krishna, with a life of devotion in one of the loving relationships of servant, friend, parent or beloved. Rupa Goswami's Bhakti-rasamrita-sindhu is the standard manual of that path. Congregational chanting of the holy name, nama-sankirtana, is the central practice. The tradition spread widely in the twentieth century through teachers such as Bhaktivinoda Thakura and A. C. Bhaktivedanta Swami Prabhupada.",
    ],
    faqs: [
      {
        q: "What does inconceivable difference and non-difference mean?",
        a: "It means souls and the world are both distinct from God and not separate from him, in a way human reason cannot completely explain. The analogy of fire and its heat is often used.",
      },
      {
        q: "What is the highest goal in this school?",
        a: "The goal is prema, pure devotional love for Krishna, which is placed above impersonal liberation. Practice centres on bhakti and the chanting of the holy name.",
      },
    ],
  },
};
