interface LanguageStrings {
  en: string;
  de: string;
}
interface Course {
  name: LanguageStrings;
  description: LanguageStrings;
}
export const GRADE_TO_PERCENT_LOOPUP = {
  '1.0': 95,
  '1.3': 90,
  '1.7': 85,
  '2.0': 80,
  '2.3': 75,
  '2.7': 70,
  '3.0': 65,
  '3.3': 60,
  '3.7': 55,
  '4.0': 50,
  '5.0': 10,
};

export const POSSIBLE_GERMAN_GRADES = [
  '1.0',
  '1.3',
  '1.7',
  '2.0',
  '2.3',
  '2.7',
  '3.0',
  '3.3',
  '3.7',
  '4.0',
  '5.0',
];

export const COURSE_DESCRIPTIONS: { [courseId: string]: Course } = {
  AI: {
    name: {
      en: 'Artificial Intelligence',
      de: 'Künstliche Intelligenz',
    },
    description: {
      en: 'A course that introduces the foundation of symbolic and statistical Artificial Intelligence',
      de: 'Ein Kurs, der die Grundlagen der symbolischen und statistischen künstlichen Intelligenz einführt',
    },
  },
  EDU: {
    name: {
      en: 'Educational Concepts',
      de: 'Bildungskonzepte',
    },
    description: {
      en: 'Concepts pertaining to understanding the learner like learner model, guided tour, competency etc.',
      de: 'Konzepte zur Erfassung des Lernenden wie Lernmodell, geführte Tour, Kompetenz usw.',
    },
  },
  EIDA: {
    name: {
      en: 'Data Structures and Algorithms',
      de: 'Einführung in die Algorithmik',
    },
    description: {
      en: 'A course that introduces mathematical modeling of computational problems, as well as common algorithms, algorithmic paradigms, and data structures used to solve these problems.',
      de: 'Ein Kurs, der die mathematische Modellierung von Berechnungsproblemen sowie gängige Algorithmen, algorithmische Paradigmen und Datenstrukturen zur Lösung dieser Probleme einführt.',
    },
  },
  GDP: {
    name: {
      en: 'Foundations of Programming',
      de: 'Grundlagen der Programmierung',
    },
    description: {
      en: 'A first programming course. It covers algorithms, programs, syntax/semantics, basic data types, control structures, OOP: objects/classes/methods, O-notation, exceptions, assertions, testing, verification, debugging',
      de: 'Ein erster Programmierkurs. Er behandelt Algorithmen, Programme, Syntax/Semantik, grundlegende Datentypen, Kontrollstrukturen, OOP: Objekte/Klassen/Methoden, O-Notation, Ausnahmen, Aussagen, Tests, Verifikation, Debugging',
    },
  },
  GENERAL: {
    name: {
      en: 'General knowledge',
      de: 'Allgemeinwissen',
    },
    description: {
      en: 'Misc items such as time, distance, currency, units',
      de: 'Verschiedene Themen wie Zeit, Entfernung, Währung, Einheiten',
    },
  },
  GLOIN: {
    name: {
      en: 'Foundation of Logic in Computer Science',
      de: 'Grundlagen der Logik in der Informatik',
    },
    description: {
      en: 'A first-year course on the foundations of Logic in Computer Science. The course covers the syntax and semantics of propositional and first-order logic as representation languages, proof methods (calculi) like natural deduction and resolution, and meta-properties like soundness and completeness of calculi. ',
      de: 'Ein Kurs im ersten Studienjahr über die Grundlagen der Logik in der Informatik. Der Kurs behandelt die Syntax und Semantik der Aussagen- und Prädikatenlogik als Repräsentationssprachen, Beweismethoden (Kalküle) wie natürliche Deduktion und Resolution sowie Metaeigenschaften wie Vollständigkeit und Korrektheit von Kalkülen.',
    },
  },
  LinAlg: {
    name: {
      en: 'Linear Algebra',
      de: 'Lineare Algebra',
    },
    description: {
      en: 'A first course in linear algebra. The course covers number systems, vector spaces, linear mappings and equation systems, matrices and their operations, determinants, eigenvectors, eigenvalues, scalar products.',
      de: 'Ein erster Kurs in linearer Algebra. Der Kurs behandelt Zahlensysteme, Vektorräume, lineare Abbildungen und Gleichungssysteme, Matrizen und ihre Operationen, Determinanten, Eigenvektoren, Eigenwerte, Skalarprodukte.',
    },
  },
  Calculus: {
    name: {
      en: 'Calculus',
      de: 'Infinitesimalrechnung',
    },
    description: {
      en: "A first course on calculus. The course covers real and complex numbers, sequences, series, and limits, univariate real functions, continuity, differentiability, differentiation, integration, Taylor series, Newton's method.",
      de: 'Ein erster Kurs in Differential- und Integralrechnung. Der Kurs behandelt reelle und komplexe Zahlen, Folgen, Reihen und Grenzwerte, univariate reale Funktionen, Stetigkeit, Differenzierbarkeit, Ableitung, Integration, Taylor-Reihen, Newton-Verfahren.',
    },
  },
  School: {
    name: {
      en: 'Highschool',
      de: 'Schule',
    },
    description: {
      en: 'Anything taught in high school',
      de: 'Alles, was in der Schule unterrichtet wird',
    },
  },
  TheoCS: {
    name: {
      en: 'Theoretical Computer Science',
      de: 'Theoretische Informatik',
    },
    description: {
      en: 'A course on the basic theoretical computer science. It covers formal languages, finite automata, grammars, the theory of computation, Turing machines, and the basics of complexity theory.',
      de: 'Ein Kurs über die grundlegende theoretische Informatik. Er behandelt formale Sprachen, endliche Automaten, Grammatiken, die Berechenbarkeitstheorie, Turing-Maschinen und die Grundlagen der Komplexitätstheorie.',
    },
  },
  'Math:stochastics': {
    name: {
      en: 'Stochastics',
      de: 'Stochastik',
    },
    description: {
      en: 'A first course in Stochastics and Statistics. It covers probability spaces, random variables, prior/conditional probabilities and their rules, various types of distributions, independence, Markov chains, expectation and variance, statistical analysis, regression, variance analysis',
      de: 'Ein erster Kurs in Stochastik und Statistik. Er behandelt Wahrscheinlichkeitsräume, Zufallsvariablen, vorherige/bedingte Wahrscheinlichkeiten und ihre Regeln, verschiedene Arten von Verteilungen, Unabhängigkeit, Markov-Ketten, Erwartungswert und Varianz, statistische Analyse, Regression, Varianzanalyse',
    },
  },
};

export const TO_EXCLUDE = ['AI', 'EDU', 'GENERAL', 'School'];
