from typing import List, Dict

AMBIGUOUS_KEYWORDS = [
    "reasonable",
    "reasonable time",
    "reasonable notice",
    "as soon as possible",
    "asap",
    "best effort",
    "best efforts",
    "if necessary",
    "promptly",
    "substantially",
    "at its discretion",
    "at the discretion",
    "mutually agreed",
    "mutually acceptable",
    "appropriate",
    "adequate",
    "sufficient",
    "makul süre",
    "mümkün olan en kısa sürede",
    "gerektiğinde",
    "uygun görüldüğünde",
    "tarafların mutabakatıyla",
]


def detect_ambiguity(text: str) -> Dict:
    """
    Metindeki belirsiz ifadeleri tespit eder.

    Döndürür:
        {
            "ambiguity_flag": True/False,
            "ambiguous_phrases": ["reasonable time", ...]
        }
    """
    text_lower = text.lower()
    found = [kw for kw in AMBIGUOUS_KEYWORDS if kw in text_lower]

    return {
        "ambiguity_flag": len(found) > 0,
        "ambiguous_phrases": found
    }


if __name__ == "__main__":
    test = "Payment shall be made within a reasonable time after receiving the invoice."
    result = detect_ambiguity(test)
    print(result)
    # {'ambiguity_flag': True, 'ambiguous_phrases': ['reasonable time']}