const {
    analyzeFashionTrends
} = require("../utils/googleTrends");


async function main() {

    console.log(
        "🔥 Starting Muse trend analysis..."
    );


    const trends =
        await analyzeFashionTrends(
            "IN"
        );


    console.log(
        "\n📈 CURRENT FASHION TRENDS:\n"
    );


    console.table(
        trends
    );

}


main();