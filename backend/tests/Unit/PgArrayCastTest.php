<?php

namespace Tests\Unit;

use App\Casts\PgArray;
use App\Models\Question;
use PHPUnit\Framework\TestCase;

class PgArrayCastTest extends TestCase
{
    private PgArray $cast;
    private Question $model;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cast = new PgArray();
        $this->model = new Question();
    }

    public function test_it_deserializes_postgres_array_string_to_php_array(): void
    {
        $raw = '{Alpha,Beta,"Gamma, Delta",Epsilon}';
        $result = $this->cast->get($this->model, 'options', $raw, []);

        $this->assertIsArray($result);
        $this->assertCount(4, $result);
        $this->assertEquals('Alpha', $result[0]);
        $this->assertEquals('Beta', $result[1]);
        $this->assertEquals('Gamma, Delta', $result[2]);
        $this->assertEquals('Epsilon', $result[3]);
    }

    public function test_it_handles_null_and_empty_strings(): void
    {
        $this->assertEquals([], $this->cast->get($this->model, 'options', null, []));
        $this->assertEquals([], $this->cast->get($this->model, 'options', '', []));
        $this->assertEquals([], $this->cast->get($this->model, 'options', '{}', []));
    }

    public function test_it_serializes_php_array_to_postgres_array_format(): void
    {
        $array = ['First', 'Second, with comma', 'Third "quotes"'];
        $serialized = $this->cast->set($this->model, 'options', $array, []);

        $this->assertStringStartsWith('{', $serialized);
        $this->assertStringEndsWith('}', $serialized);
        $this->assertStringContainsString('"Second, with comma"', $serialized);
    }

    public function test_it_serializes_empty_array_to_empty_braces(): void
    {
        $this->assertEquals('{}', $this->cast->set($this->model, 'options', [], []));
        $this->assertEquals('{}', $this->cast->set($this->model, 'options', null, []));
    }
}
