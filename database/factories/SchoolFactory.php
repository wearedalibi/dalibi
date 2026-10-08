<?php

namespace Database\Factories;

use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<School>
 */
class SchoolFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'level' => fake()->randomElement(['primaire', 'college', 'lycee']),
            'code' => strtoupper(fake()->unique()->bothify('SCH##??')),
            'address' => fake()->address(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->unique()->safeEmail(),
            'principal' => fake()->name(),
            'description' => null,
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['active' => false]);
    }
}
