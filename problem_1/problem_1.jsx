Problem 1: Three ways to sum to n

Using a for Loop (Iterative Approach)
This is often the most straightforward and intuitive way to solve summation problems.

var sum_to_n_a = function(n) {
    let sum = 0; // Initialize a variable to store the sum
    for (let i = 1; i <= n; i++) { // Loop from 1 up to n
        sum += i; // Add the current number to the sum
    }
    return sum; // Return the final sum
};

Using the Arithmetic Series Formula (Mathematical Approach)
This approach is very concise and performs in constant time, meaning its speed doesn't depend on how large n is.

var sum_to_n_b = function(n) {
    // Apply the arithmetic series formula directly
    return n * (n + 1) / 2;
};

Using Recursion (Recursive Approach)
Recursion is a technique where a function calls itself to solve smaller sub-problems until it reaches a base case. For summation, the idea is that the sum of numbers up to n is n plus the sum of numbers up to n-1.

var sum_to_n_c = function(n) {
    if (n <= 0) { // Base case: if n is 0 or less, the sum is 0
        return 0;
    } else { // Recursive step: sum up to n is n + sum up to n-1
        return n + sum_to_n_c(n - 1);
    }
};