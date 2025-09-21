import db from "../../database.js"

// Get footer content
export const getFooterContent = async (req, res) => {
  try {
    // For now, return static content
    // In the future, this could be stored in a database table
    const footerContent = {
      organizationName: "FAITH CommUNITY",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam pulvinar ac.",
      phone: "+163-3654-7896",
      email: "info@faithcommunity.com",
      socialLinks: {
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        twitter: "https://x.com"
      },
      quickLinks: [
        { name: "About Us", url: "/about" },
        { name: "Programs & Services", url: "/programs" },
        { name: "Faithree", url: "/faithree" },
        { name: "Apply Now", url: "/apply" },
        { name: "FAQs", url: "/faqs" }
      ],
      services: [
        "Give Donation",
        "Education Support", 
        "Food Support",
        "Health Support",
        "Our Campaign"
      ],
      copyright: "© Copyright 2025 FAITH CommUNITY. All Rights Reserved."
    }

    res.json({
      success: true,
      data: footerContent
    })
  } catch (error) {
    console.error("Error getting footer content:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get footer content",
      error: error.message
    })
  }
}

// Update footer content (for future use)
export const updateFooterContent = async (req, res) => {
  try {
    // This would be implemented when footer content becomes editable
    // For now, just return success
    res.json({
      success: true,
      message: "Footer content updated successfully"
    })
  } catch (error) {
    console.error("Error updating footer content:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update footer content",
      error: error.message
    })
  }
}
