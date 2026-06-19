const anthropic = require('../../config/claude');
const db = require('../../config/db');

exports.getAIRecommendations = async (req, res, next) => {
  try {
    // 1. Pull the user's saved style profile from the database
    const userRes = await db.query('SELECT style_profile FROM users WHERE id = $1', [req.user.id]);
    const styleProfile = userRes.rows[0]?.style_profile || {};

    if (!styleProfile.hairType && !styleProfile.faceShape) {
      return res.status(400).json({
        error: {
          message: "Your style profile is empty. Please update your profile parameters first to get smart recommendations.",
          code: "EMPTY_STYLE_PROFILE"
        }
      });
    }

    // 2. Query Claude to parse preferences and generate optimized search keywords
    const prompt = `You are an expert AI salon stylist advisor matching user physical traits to treatment terms.
    User Profile Data: ${JSON.stringify(styleProfile)}
    
    Based on this profile, identify the top 3 specific service treatments they would benefit from (e.g., 'Hydrating Keratin Treatment' for frizzy hair, 'Balayage' for specific face framing).
    
    Respond with ONLY a clean, raw JSON array containing strings of these treatment names. No extra prose, markdown, or text. Example format: ["Treatment One", "Treatment Two"]`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Production grade model
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    // Extract content safely
    const aiText = response.content[0].text.trim();
    let keywordsArray = [];
    try {
      keywordsArray = JSON.parse(aiText);
    } catch (e) {
      // Fallback parser if Claude wraps JSON in markdown blocks
      const cleanJson = aiText.replace(/```json|```/g, '').trim();
      keywordsArray = JSON.parse(cleanJson);
    }

    // 3. Convert extracted keywords into a dummy vector for matching
    // (In a full production build, you would pass strings to an embedding model.
    // For a rapid hackathon demo, we generate a mock 1536-dim normalized vector or query matching text.)
    const placeholderVector = Array(1536).fill(0).map(() => (Math.random() - 0.5));
    const vectorString = `[${placeholderVector.join(',')}]`;

    // 4. Perform pgvector Cosine Distance Query against the salon catalog
    // <=> calculates cosine distance (0 means identical, 2 means completely opposite)
    const exactMatches = await db.query(
      `SELECT s.id as salon_id, s.name as salon_name, s.address, 
              sv.name as service_name, sv.price, sv.duration_minutes,
              (sv.embedding <=> $1::vector) as distance
       FROM salon_services sv
       JOIN salons s ON sv.salon_id = s.id
       ORDER BY distance ASC
       LIMIT 5`,
      [vectorString]
    );

    // 5. Build a text search fallback if vector spaces are empty during local testing
    let recommendations = exactMatches.rows;
    if (recommendations.length === 0 || recommendations[0].distance > 0.9) {
      // Fallback back to lightning-fast fuzzy text matching across service listings
      const textSearchRes = await db.query(
        `SELECT s.id as salon_id, s.name as salon_name, s.address, 
                sv.name as service_name, sv.price, sv.duration_minutes
         FROM salon_services sv
         JOIN salons s ON sv.salon_id = s.id
         WHERE sv.name ILIKE $1 OR sv.description ILIKE $1
         LIMIT 5`,
        [`%${keywordsArray[0] || ''}%`]
      );
      recommendations = textSearchRes.rows;
    }

    res.status(200).json({
      aiAnalysis: {
        detectedKeywords: keywordsArray,
        rationale: `Tailored recommendations generated for your ${styleProfile.hairType || 'unique'} hair and ${styleProfile.faceShape || 'distinct'} look.`
      },
      recommendedServices: recommendations
    });

  } catch (err) {
    next(err);
  }
};