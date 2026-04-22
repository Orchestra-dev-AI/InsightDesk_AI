import os
from openai import OpenAI

# ---------------------------------------------------------
# Example: Bookstore Management AI
# ---------------------------------------------------------
# HOW TO ADD YOUR API KEY:
# InsightDesk keys are strictly for the Supervisor and Platform. 
# Your custom AI MUST bring its own API key!
# Option 1: Hardcode it right here (Quickest for testing)
# Option 2: Set it in your computer's System Environment Variables
# ---------------------------------------------------------

# We are using the Groq API key provided by the user.
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key="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"
)

def get_book_info(query: str) -> str:
    """Enhanced Mock Database for Bookstore."""
    query = query.lower()
    
    # ── MOCK DATABASE DATA ──
    inventory = {
        "harry potter": "5 copies available in Aisle 4 (Fiction). Price: $19.99.",
        "dune": "OUT OF STOCK. Expected restock: Tuesday morning.",
        "atomic habits": "8 copies in Aisle 1 (Self-Help). Price: $24.50.",
        "the great gatsby": "2 copies in Aisle 4 (Classics). Price: $12.00.",
        "project hail mary": "Limited stock: 1 copy remaining in Sci-Fi. Price: $28.00.",
        "1984": "Available in the Classics section. Price: $10.99.",
        "steve jobs biography": "3 copies in Biography section. Price: $30.00."
    }

    # Search for key phrases in the query
    for book, info in inventory.items():
        if book in query:
            return f"DATABASE FOUND: {info}"
    
    # Check for categories
    if "recommend" in query or "best" in query or "suggestion" in query:
        return "DATABASE RECOMMENDATION: Our current best-sellers are 'Atomic Habits' and 'Project Hail Mary'."
    
    if "location" in query or "where" in query:
        return "DATABASE INFO: We are located at 123 Reading Lane. Open 9 AM - 9 PM daily."

    return "DATABASE SEARCH COMPLETE: No exact match found for your specific query."

def resolve(query: str) -> str:
    """
    THE UNIVERSAL RESOLVER
    This function handles the logic, interacts with the LLM, and provides 
    the result back to InsightDesk.
    """
    print(f"\n[Bookstore AI] INCOMING QUERY: {query}")
    
    # STEP 1: Check the internal database first
    db_result = get_book_info(query)
    
    # STEP 2: Use the LLM to provide a professional, helpful response
    try:
        # We simulate a "thought process" so the Supervisor can audit the steps
        system_prompt = (
            "You are 'The Bibliophile Assistant', the AI manager of a high-end bookstore. "
            "Use the DATABASE results provided to answer accurately. "
            "If the database says something is OUT OF STOCK, do not lie and say we have it. "
            "Be polite, professional, and always invite the customer to visit us."
        )

        prompt = f"USER QUERY: {query}\n\n{db_result}\n\nSynthesize a final answer based on the database info."

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", # Groq's high-speed Llama 3.3
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1024
        )
        
        final_answer = completion.choices[0].message.content
        print(f"[Bookstore AI] RESOLUTION: {final_answer[:50]}...")
        return final_answer

    except Exception as e:
        error_msg = f"ERROR: Bookstore AI could not reach Groq. {str(e)}"
        print(f"[Bookstore AI] {error_msg}")
        return error_msg

# Test locally if run directly
if __name__ == "__main__":
    print("\n--- LOCAL TEST RUN ---")
    print(resolve("Do you have Harry Potter in stock?"))
    print(resolve("I'm looking for a gift recommendation."))
