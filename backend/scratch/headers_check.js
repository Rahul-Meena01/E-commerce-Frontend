const testHeaders = async () => {
  try {
    const res = await fetch("http://localhost:3000/");
    console.log("=== HEADERS ===");
    for (const [key, value] of res.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
  } catch (err) {
    console.error(err);
  }
};

testHeaders();
