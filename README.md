# Prime Factor Rings — Visual GCD, LCM & Euclidean Explorer

An interactive, aesthetic mathematical web application inspired by the question paper visualization where each number from 1 to 100 is illustrated by concentric circular arcs corresponding to its prime factorization.

[![Live Web Application](https://img.shields.io/badge/Live%20Demo-discrete00ankit.github.io%2Fprime--factor--rings-success?style=for-the-badge&logo=github)](https://discrete00ankit.github.io/prime-factor-rings/)

**🔗 Live Website:** [https://discrete00ankit.github.io/prime-factor-rings/](https://discrete00ankit.github.io/prime-factor-rings/)

---

## 🌟 The Core Mathematical Concept

Every integer $n > 1$ has a unique representation as a product of prime powers (The Fundamental Theorem of Arithmetic):
$$n = p_1^{a_1} \cdot p_2^{a_2} \cdots p_k^{a_k}$$

In this visual representation:
1. The ring around each number is segmented into $N = \sum a_i$ circular arcs separated by clean gaps.
2. Each prime number is assigned a unique, pleasing color hue:
   - **1**: Neutral Slate Grey (the multiplicative unit with zero prime factors)
   - **2**: Emerald Green
   - **3**: Royal Purple
   - **5**: Warm Amber Orange
   - **7**: Cerulean Blue
   - **$\ge 11$**: Ruby Red
3. **The $11^2 > 100$ Insight**:
   In the 1–100 question paper chart, all primes $\ge 11$ (11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97) are colored red. Why?
   Because the smallest composite of two primes $\ge 11$ is $11 \times 11 = 121 > 100$. Therefore, within the numbers $1$ to $100$, **no composite ever has more than one prime factor $\ge 11$**. This allowed the question paper authors to safely group primes $\ge 11$ under one color without introducing arc ambiguity!

---

## 🚀 Key Features

### 1. 🔢 1 to 100 Interactive Visual Grid
- 10×10 matrix matching the original question paper layout.
- Filter by: All numbers, Primes only, Multiples of 2, 3, 5, 7, Primes $\ge 11$, and Perfect Squares.
- Search box to quickly locate any integer.
- Real-time mouse glide inspector with cursor tooltip and floating bottom HUD.

### 2. 🟢 Animated GCD Visual Studio ("Smaller Count of Arcs")
- Visualizes $\gcd(A, B)$ using the **Smaller Count Rule**: for each prime color, take the smaller number of arcs shared by both numbers.
- Side-by-side comparison of Number A and Number B rings and animated step-by-step token transfer into the GCD basket.
- Preloaded with presets including $64 \ \& \ 100$, $60 \ \& \ 72$, and $24 \ \& \ 36$.

### 3. 🟣 LCM Visual Studio ("Largest Count of Arcs")
- Visualizes $\text{lcm}(A, B)$ using the **Largest Count Rule**: for each prime color, take the maximum count of arcs appearing in either number.
- Combines prime power arcs into the resulting LCM circle ($360$ for 60 & 72; $1,600$ for 64 & 100).
- **The Arc Conservation Theorem**:
  $$\gcd(A, B) \times \text{lcm}(A, B) = A \times B$$
  Demonstrates that every prime arc from $A$ and $B$ is conserved ($\text{smaller count} + \text{largest count} = \text{total arcs}$).

### 4. ⚖️ Euclid's Division Algorithm Lab ("When Arcs Get Too Big")
- Mathematical motivation: For large numbers (e.g., $2024$ and $748$), factoring requires searching for primes up to $\sqrt{N}$ and counting dozens of arcs is impractical.
- Euclid's method solves $\gcd(A, B)$ in $O(\log N)$ time without factoring:
  $$a = b \cdot q + r \implies \gcd(a, b) = \gcd(b, r)$$
- Interactive Stepper with:
  - **Geometric bar / segment tiling visualization**: watch divisor $b$ tile into dividend $a$ with highlighted remainder $r$.
  - Step equation list with active step tracker.
  - Controls: `[⏮ Prev]`, `[▶ Auto-Play]`, `[Next ▶]`, and `[↺ Reset]`.

### 5. 📝 Exam Worksheet Challenge ($360^{2026} \pmod 7$)
- Interactive solver for question (iv) from the exam worksheet:
  - $L = \text{lcm}(60, 72) = 360$
  - Step 1: $360 \equiv 3 \pmod 7$
  - Step 2: Cycle of powers of 3 modulo 7 on a visual 7-hour clock: period length is 6.
  - Step 3: $2026 = 6 \times 337 + 4 \implies 360^{2026} \equiv 3^4 = 81 \equiv 4 \pmod 7$.
- General modular exponentiation calculator to test any base, exponent, and modulus.

### 6. 🎨 Palette Switcher
- **Worksheet Original**: Faithfully replicates the exam paper color scheme.
- **Spectrum Mode**: Gives each prime factor a distinct individual color hue.

---

## 💻 How to Run Locally

1. Open your terminal and navigate to the project directory:
   ```bash
   cd /Users/newtonuser/.gemini/antigravity/scratch/prime-factor-visualizer
   ```

2. Start a lightweight local Python HTTP server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser and visit:
   ```
   http://localhost:8000
   ```
   *(Or simply double click `index.html` to open directly in Google Chrome, Safari, or Firefox without any server required!)*

---

## 🌐 How to Push to GitHub & Deploy to GitHub Pages

To publish this project to GitHub and host it live for free:

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `prime-factor-visualizer`).
2. Link your local repository and push:
   ```bash
   cd /Users/newtonuser/.gemini/antigravity/scratch/prime-factor-visualizer
   git remote add origin https://github.com/<YOUR-USERNAME>/prime-factor-visualizer.git
   git branch -M main
   git push -u origin main
   ```
3. Enable **GitHub Pages**:
   - Go to your repository settings on GitHub $\to$ **Pages**.
   - Under **Build and deployment**, select `Deploy from a branch`.
   - Choose `main` branch and `/ (root)` folder $\to$ Click **Save**.
   - Your site will be live instantly at: `https://<YOUR-USERNAME>.github.io/prime-factor-visualizer/`!
